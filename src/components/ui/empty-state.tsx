import { LucideIcon } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center',
        compact ? 'p-4 gap-1.5' : 'p-8 gap-3',
        className
      )}
    >
      {Icon && (
        <div className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500">
          <Icon className={compact ? 'w-4 h-4' : 'w-6 h-6'} />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className={cn('font-semibold text-slate-700 dark:text-slate-300', compact ? 'text-xs' : 'text-sm')}>
          {title}
        </h3>
        {description && (
          <p className={cn('text-slate-400 dark:text-slate-500', compact ? 'text-[11px]' : 'text-xs')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
