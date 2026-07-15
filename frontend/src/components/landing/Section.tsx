import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  tone?: 'plain' | 'surface';
  border?: 'none' | 'top' | 'both';
  padY?: boolean;
  className?: string;
  as?: 'section' | 'header' | 'footer' | 'div';
}

const TONE_CLASSES: Record<NonNullable<SectionProps['tone']>, string> = {
  plain: 'bg-white',
  surface: 'bg-surface-container-low',
};

const BORDER_CLASSES: Record<NonNullable<SectionProps['border']>, string> = {
  none: '',
  top: 'border-t border-outline-variant/30',
  both: 'border-y border-outline-variant/30',
};

/**
 * Shared section shell — every landing-page block renders through this so the
 * page shares one container width and one vertical rhythm instead of each
 * section improvising its own max-width/padding combination.
 */
export const Section: React.FC<SectionProps> = ({
  children,
  tone = 'plain',
  border = 'none',
  padY = true,
  className = '',
  as: Tag = 'section',
}) => {
  return (
    <Tag className={`${TONE_CLASSES[tone]} ${BORDER_CLASSES[border]} ${className}`}>
      <div className={`max-w-5xl mx-auto px-container-margin ${padY ? 'py-section' : ''}`}>{children}</div>
    </Tag>
  );
};

export default Section;
