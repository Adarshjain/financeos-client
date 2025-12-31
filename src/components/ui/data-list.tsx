import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

// Mobile-friendly data list component (card-based layout)
const DataList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-3', className)}
        {...props}
      />
    );
  }
);

DataList.displayName = 'DataList';

const DataListItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
          className
        )}
        {...props}
      />
    );
  }
);

DataListItem.displayName = 'DataListItem';

const DataListRow = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex justify-between items-start gap-2', className)}
        {...props}
      />
    );
  }
);

DataListRow.displayName = 'DataListRow';

const DataListLabel = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('text-xs text-slate-500 uppercase tracking-wide', className)}
        {...props}
      />
    );
  }
);

DataListLabel.displayName = 'DataListLabel';

const DataListValue = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('text-sm text-slate-900 dark:text-slate-100', className)}
        {...props}
      />
    );
  }
);

DataListValue.displayName = 'DataListValue';

export { DataList, DataListItem, DataListRow, DataListLabel, DataListValue };
