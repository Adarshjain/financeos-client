import type { LucideIcon } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  icon?: LucideIcon;
  size?: IconSize;
  className?: string;
  children?: React.ReactNode;
}

const sizeClasses: Record<IconSize, string> = {
  sm: 'w-icon-sm h-icon-sm',
  md: 'w-icon-md h-icon-md',
  lg: 'w-icon-lg h-icon-lg',
};

const pixelSizes: Record<IconSize, number> = {
  sm: 14,
  md: 16,
  lg: 20,
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: IconComponent, size = 'md', className, children, ...props }, ref) => {
    const classes = cn('shrink-0 inline-block align-middle', sizeClasses[size], className);

    if (IconComponent) {
      return (
        <IconComponent
          ref={ref}
          size={pixelSizes[size]}
          className={classes}
          strokeWidth={2}
          aria-hidden="true"
          {...props}
        />
      );
    }

    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(classes, (children.props as { className?: string })?.className),
        strokeWidth: 2,
        'aria-hidden': 'true',
        ...props,
      });
    }

    return null;
  }
);

Icon.displayName = 'Icon';
