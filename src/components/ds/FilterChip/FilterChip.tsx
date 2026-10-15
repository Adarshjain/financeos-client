import { ChevronDown, X } from 'lucide-react';
import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

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

    const countNode =
      count !== undefined && count !== null ? (
        <Badge variant="count" count={count} />
      ) : null;

    const dropdownNode = hasDropdown ? (
      <Icon icon={ChevronDown} size="sm" className="text-current shrink-0" />
    ) : null;

    const toneClasses = cn(
      isMore && 'border-dashed border-line-strong bg-surface text-ink-2 hover:bg-hover',
      !isMore && !active && 'border-line-strong bg-surface text-ink-2 hover:bg-hover',
      !isMore && active && !isAmber && 'bg-brand-tint border-brand-border text-brand-strong hover:bg-brand-tint',
      !isMore && active && isAmber && 'bg-warning-tint border-warning-border text-warning hover:bg-warning-tint',
    );

    if (showRemove) {
      return (
        <span
          className={cn(
            'inline-flex items-center h-chip rounded-ds-pill border font-text font-semibold text-label whitespace-nowrap select-none transition-colors duration-fast',
            toneClasses,
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          <button
            ref={ref}
            type={type}
            disabled={disabled}
            onClick={onClick}
            className="inline-flex items-center gap-space-6 h-full pl-space-10 pr-space-4 bg-transparent border-0 text-inherit font-text font-semibold text-label cursor-pointer rounded-l-ds-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed"
            {...props}
          >
            <span>{children}</span>
            {countNode}
            {dropdownNode}
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label="Remove filter"
            onClick={handleRemoveClick}
            className="inline-flex items-center justify-center h-full pl-space-2 pr-space-8 bg-transparent border-0 text-inherit font-text font-semibold text-label cursor-pointer rounded-r-ds-pill opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed"
          >
            <Icon icon={X} size="sm" />
          </button>
        </span>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-space-6 h-chip px-space-10 rounded-ds-pill border font-text font-semibold text-label whitespace-nowrap transition-colors duration-fast select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          toneClasses,
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {countNode}
        {dropdownNode}
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
