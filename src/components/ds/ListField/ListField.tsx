import React, { forwardRef } from 'react';

import { cn } from '../cn';

/**
 * ListField: A label/value pair for detail sheets.
 */
export interface ListFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value?: React.ReactNode;
  borderTop?: boolean;
}

export const ListField = forwardRef<HTMLDivElement, ListFieldProps>(
  ({ children, className, label, value, borderTop = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-space-12 px-space-16 py-space-8 text-body font-text',
          borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
          className,
        )}
        {...props}
      >
        <span className="text-ink-3 shrink-0 font-medium">{label}</span>
        {value !== undefined ? (
          <span className="text-ink font-semibold text-right min-w-0 break-words">{value}</span>
        ) : (
          children
        )}
      </div>
    );
  },
);

ListField.displayName = 'ListField';
