import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { type IconName, iconRegistry } from './registry';

export { iconRegistry };
export type { IconName };
export type IconSize = 'xs' | 'sm' | 'md' | 'lg';
export type IconWeight = 'bold' | 'fill';

export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'size'> {
  name: IconName;
  size?: IconSize;
  /** `fill` draws the solid shape, for a status mark such as a warning badge. */
  weight?: IconWeight;
  className?: string;
}

const sizeClasses: Record<IconSize, string> = {
  xs: 'w-icon-xs h-icon-xs',
  sm: 'w-icon-sm h-icon-sm',
  md: 'w-icon-md h-icon-md',
  lg: 'w-icon-lg h-icon-lg',
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 'md', weight = 'bold', className, ...props }, ref) => {
    const data = iconRegistry[name];
    if (!data) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Icon] Unknown icon name: "${name}"`);
      }
      return null;
    }
    if (weight === 'fill' && !data.fill && process.env.NODE_ENV !== 'production') {
      console.warn(`[Icon] No fill weight for "${name}", drawing bold`);
    }
    const shapes = (weight === 'fill' && data.fill) || data.bold;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        fill="currentColor"
        aria-hidden="true"
        className={cn('shrink-0 inline-block align-middle', sizeClasses[size], className)}
        {...props}
      >
        {shapes.map(([Tag, attrs], i) => (
          <Tag key={i} {...attrs} />
        ))}
      </svg>
    );
  },
);

Icon.displayName = 'Icon';
