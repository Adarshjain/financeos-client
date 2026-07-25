import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  {
    variants: {
      variant: {
        default:
          'bg-secondary text-secondary-foreground',
        success:
          'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        warning:
          'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        secondary:
          'bg-muted text-muted-foreground',
        // `danger` was a byte-identical duplicate of this and both were in use,
        // so a restyle of one would silently have missed the other's call sites.
        // `destructive` is the survivor because Button and Alert already use that
        // name, making one shared vocabulary across the primitives.
        destructive:
          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        outline:
          'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    } as const,
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
