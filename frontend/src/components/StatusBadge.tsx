import React from 'react';

interface StatusBadgeProps {
  type: 'status' | 'category' | 'priority' | 'severity';
  value: string;
}

const STATUS_LABELS: Record<string, { label: string; classes: string; icon: string }> = {
  submitted: { label: 'Submitted', classes: 'bg-primary/10 text-primary border border-primary/20', icon: 'pending_actions' },
  under_admin_review: { label: 'Under Review', classes: 'bg-primary/10 text-primary border border-primary/20', icon: 'pending_actions' },
  rejected_mismatch: { label: 'Needs Fix', classes: 'bg-error-container text-on-error-container border border-error/30', icon: 'error' },
  assigned_to_crew: { label: 'Assigned', classes: 'bg-secondary-container text-on-secondary-container border border-secondary-container', icon: 'engineering' },
  crew_accepted: { label: 'Fixing', classes: 'bg-secondary-container text-on-secondary-container border border-secondary-container', icon: 'engineering' },
  pending_ai_verification: { label: 'Verifying', classes: 'bg-tertiary-fixed/40 text-on-tertiary-fixed-variant border border-tertiary/20', icon: 'psychology' },
  resolved: { label: 'Resolved', classes: 'bg-secondary text-white border border-secondary', icon: 'check_circle' },
};

const CATEGORY_LABELS: Record<string, string> = {
  'Road Damage': 'ROAD DAMAGE',
  'Street Lighting': 'STREET LIGHTING',
  'Waste Management': 'WASTE MGMT',
  'Water Leak': 'WATER LEAK',
  'Public Safety': 'PUBLIC SAFETY',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  let classes = 'bg-surface-variant text-on-surface-variant';
  let label = value.toUpperCase();
  let icon = '';

  if (type === 'status') {
    const entry = STATUS_LABELS[value];
    if (entry) {
      classes = entry.classes;
      label = entry.label;
      icon = entry.icon;
    }
  } else if (type === 'category') {
    classes = 'bg-secondary-container text-on-secondary-container';
    label = CATEGORY_LABELS[value] ?? value.toUpperCase();
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
  } else if (type === 'severity') {
    switch (value) {
      case 'high':
        classes = 'bg-error text-white font-bold';
        label = 'HIGH SEVERITY';
        icon = 'local_fire_department';
        break;
      case 'mid':
        classes = 'bg-tertiary-container text-on-tertiary-container font-bold';
        label = 'MID SEVERITY';
        icon = 'warning';
        break;
      default:
        classes = 'bg-surface-container text-on-surface-variant';
        label = 'LOW SEVERITY';
        icon = 'info';
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
