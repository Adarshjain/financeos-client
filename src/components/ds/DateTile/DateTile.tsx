import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface DateTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Day number, e.g. 15, 23, 28 */
  day: number | string;
  /** Month short name, e.g. "OCT", "NOV" */
  monthLabel?: string;
}

export const DateTile = forwardRef<HTMLDivElement, DateTileProps>(
  ({ day, monthLabel, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-10 text-center shrink-0 select-none', className)}
        {...props}
      >
        <b className="block text-heading font-extrabold text-ink leading-none">
          {day}
        </b>
        {monthLabel ? (
          <span className="block text-overline font-extrabold tracking-wider text-ink-4 uppercase mt-space-2 leading-none">
            {monthLabel}
          </span>
        ) : null}
      </div>
    );
  },
);

DateTile.displayName = 'DateTile';
