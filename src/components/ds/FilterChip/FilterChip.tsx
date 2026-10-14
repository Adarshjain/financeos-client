import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type FilterChipVariant = 'default' | 'amber' | 'more';

export interface FilterChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: FilterChipVariant;
  hasDropdown?: boolean;
  count?: number;
  removable?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
}

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  (
    {
      children,
      active = false,
      variant = 'default',
      hasDropdown = false,
      count,
      removable = false,
      onRemove,
      disabled = false,
      className,
      onClick,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isAmber = variant === 'amber';
    const isMore = variant === 'more';
    const showRemove = removable || Boolean(onRemove);

    const handleRemoveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.(e);
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-space-6 h-chip px-space-10 rounded-ds-pill border font-text font-semibold text-label whitespace-nowrap transition-colors duration-fast select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          isMore && 'border-dashed border-line-strong bg-surface text-ink-2 hover:bg-hover',
          !isMore && !active && 'border-line-strong bg-surface text-ink-2 hover:bg-hover',
          !isMore && active && !isAmber && 'bg-brand-tint border-brand-border text-brand-strong hover:bg-brand-tint',
          !isMore && active && isAmber && 'bg-warning-tint border-warning-border text-warning hover:bg-warning-tint',
          showRemove && 'pr-space-6',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        {...props}
      >
        <span>{children}</span>

        {count !== undefined && count !== null ? (
          <span
            style={{ minWidth: 18, height: 18 }}
            className="inline-flex items-center justify-center px-space-6 rounded-ds-pill bg-ink text-on-brand font-text font-bold text-tab-label select-none"
          >
            {count}
          </span>
        ) : null}

        {hasDropdown ? (
          <span className="font-text text-overline text-ink-4 select-none leading-none">
            ▾
          </span>
        ) : null}

        {showRemove ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Remove filter"
            onClick={handleRemoveClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRemoveClick(e as unknown as React.MouseEvent);
              }
            }}
            className="font-text font-extrabold ml-0.5 text-inherit opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </span>
        ) : null}
      </button>
    );
  },
);

FilterChip.displayName = 'FilterChip';

export interface FilterChipRowProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const FilterChipRow = forwardRef<HTMLDivElement, FilterChipRowProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-space-8 items-center overflow-x-auto flex-nowrap scrollbar-none py-space-2',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

FilterChipRow.displayName = 'FilterChipRow';
