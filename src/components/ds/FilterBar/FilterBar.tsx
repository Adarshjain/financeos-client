'use client';

import React, { forwardRef, useState } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { TextField } from '../TextField/TextField';

export interface FilterBarSearch {
  value: string;
  onValueChange: (value: string) => void;
  /** Defaults to "Search". */
  placeholder?: string;
}

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The search field, first in the row. Without it the row is just the chips. */
  search?: FilterBarSearch;
  /** The filter chips and dropdown chips (FilterChip, default pill shape), after the search field. */
  children?: React.ReactNode;
}

/**
 * FilterBar: the search + filter row of a list page.
 * One row, search first, then the chips; the row scrolls sideways when they overflow.
 * Phone: the search field rests narrow (space-96) and, while focused or holding text, grows to the
 * viewport inset width (the chips scroll away) and shrinks back when blurred and empty.
 * Desktop: a fixed container-xs field, the same row as every list page had before.
 */
export const FilterBar = forwardRef<HTMLDivElement, FilterBarProps>(
  ({ search, children, className, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const expanded = focused || (search?.value ?? '') !== '';

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-space-8 overflow-x-auto', className)}
        {...props}
      >
        {search ? (
          <div
            className={cn(
              'shrink-0 desk:w-container-xs transition-all duration-base motion-reduce:transition-none',
              expanded ? 'w-screen max-w-container-viewport-inset' : 'w-space-96',
            )}
          >
            <TextField
              type="search"
              size="md"
              prefix={<Icon name="search" size="sm" />}
              clearable
              placeholder={search.placeholder ?? 'Search'}
              value={search.value}
              onValueChange={search.onValueChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </div>
        ) : null}
        {children}
      </div>
    );
  },
);

FilterBar.displayName = 'FilterBar';
