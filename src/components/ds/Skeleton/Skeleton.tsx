import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton, e.g. '60%', 32, '100px' */
  width?: string | number;
  /** Height of the skeleton, e.g. 12, 22, '32px' */
  height?: string | number;
  /** Whether the skeleton is circular (e.g. for avatars) */
  circle?: boolean;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      style,
      width,
      height,
      circle = false,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        style={{
          width,
          height,
          ...style,
        }}
        className={cn(
          'bg-line-soft animate-pulse motion-reduce:animate-none shrink-0',
          circle ? 'rounded-ds-pill aspect-square' : 'rounded-ds-xs h-space-12',
          className,
        )}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
