import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { type IconName, iconRegistry } from './registry';

export { iconRegistry };
export type { IconName };
export type IconSize = 'xs' | 'sm' | 'md' | 'lg';
export type IconWeight = 'duotone' | 'fill';

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
  ({ name, size = 'md', weight = 'duotone', className, ...props }, ref) => {
    const Component = iconRegistry[name];
    if (!Component) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Icon] Unknown icon name: "${name}"`);
      }
      return null;
    }

    return (
      <Component
        ref={ref}
        weight={weight}
        color="currentColor"
        aria-hidden="true"
        className={cn('shrink-0 inline-block align-middle', sizeClasses[size], className)}
        {...props}
      />
    );
  },
);

Icon.displayName = 'Icon';
