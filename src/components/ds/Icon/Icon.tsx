import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { type IconName,iconRegistry } from './registry';

export type { IconName };
export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'size'> {
  name: IconName;
  size?: IconSize;
  className?: string;
}

const sizeClasses: Record<IconSize, string> = {
  sm: 'w-icon-sm h-icon-sm',
  md: 'w-icon-md h-icon-md',
  lg: 'w-icon-lg h-icon-lg',
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 'md', className, ...props }, ref) => {
    const Component = iconRegistry[name];
    if (!Component) return null;

    return (
      <Component
        ref={ref}
        weight="bold"
        color="currentColor"
        aria-hidden="true"
        className={cn('shrink-0 inline-block align-middle', sizeClasses[size], className)}
        {...props}
      />
    );
  },
);

Icon.displayName = 'Icon';
