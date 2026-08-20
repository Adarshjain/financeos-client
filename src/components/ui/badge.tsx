import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-secondary text-secondary-foreground',
        success:
          'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
        emerald:
          'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
        warning:
          'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
        amber:
          'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
        info: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
        blue: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
        violet:
          'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
        slate:
          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
        secondary:
          'bg-muted text-muted-foreground',
        destructive:
          'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400',
        outline:
          'border border-border text-foreground',
      },
      size: {
        default: 'px-2.5 py-0.5 rounded-full text-xs font-medium',
        sm: 'px-2 py-0.5 rounded text-2xs font-semibold',
        xs: 'px-1.5 py-0.5 rounded text-2xs font-bold uppercase tracking-wide',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

