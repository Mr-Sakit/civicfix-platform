import React from 'react';

interface CardProps {
  icon?: string;
  title?: string;
  children: React.ReactNode;
  badge?: string;
}

/**
 * Shared card shell — fixed padding, fixed min-height, fixed icon-circle
 * treatment, so Features and Testimonials resolve to identically-sized
 * cards instead of each grid drifting to its own proportions.
 */
export const Card: React.FC<CardProps> = ({ icon, title, children, badge }) => {
  return (
    <div className="bg-white rounded-2xl p-lg border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col min-h-[220px]">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-md shrink-0">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      )}
      {badge && <span className="text-xs font-bold text-outline mb-1">{badge}</span>}
      {title && <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">{title}</h3>}
      <div className="text-body-md text-on-surface-variant flex-1">{children}</div>
    </div>
  );
};

export default Card;
