import { forwardRef,HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

// Mobile-friendly data list component (card-based layout)
const DataList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('space-y-3', className)} {...props} />;
  }
);

DataList.displayName = 'DataList';

const DataListItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-muted/50 border border-border rounded-lg p-4 space-y-3 transition-colors hover:bg-muted',
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

const DataListLabel = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        'text-xs text-muted-foreground uppercase tracking-wide',
        className
      )}
      {...props}
    />
  );
});

DataListLabel.displayName = 'DataListLabel';

const DataListValue = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn('text-sm text-foreground', className)}
      {...props}
    />
  );
});

DataListValue.displayName = 'DataListValue';

export { DataList, DataListItem, DataListLabel, DataListRow, DataListValue };
