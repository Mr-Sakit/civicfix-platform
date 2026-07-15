import React from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle, align = 'center' }) => {
  const isCenter = align === 'center';
  return (
    <div className={`mb-xl ${isCenter ? 'text-center' : 'text-left'}`}>
      <h2 className="text-headline-lg font-headline-lg text-on-surface mb-xs">{title}</h2>
      {subtitle && (
        <p className={`text-body-md text-on-surface-variant max-w-xl ${isCenter ? 'mx-auto' : ''}`}>{subtitle}</p>
      )}
    </div>
  );
};

export default SectionHeading;
