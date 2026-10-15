import { ChevronRight, MoreVertical } from 'lucide-react';
import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export interface ListRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Leading element: Badge, Avatar, DateTile, or custom node */
  leading?: React.ReactNode;
  /** Primary text/title */
  title?: React.ReactNode;
  /** Secondary context text */
  subtitle?: React.ReactNode;
  /** Trailing element: action button, icon, etc. */
  trailing?: React.ReactNode;
  /** Convenience for trailing numeric amount */
  amount?: React.ReactNode;
  /** If true, styles trailing amount as positive (+ sign, positive tone) */
  isCredit?: boolean;
  /** If true, appends a chevron arrow indicator at the end */
  chevron?: boolean;
  /** If true or function, renders a trailing kebab (More options) icon/button */
  kebab?: boolean | (() => void);
  /** Highlighted row (opened from notification): 4px brand-strong stripe on brand-tint */
  highlighted?: boolean;
  /** Alias for highlighted */
  hl?: boolean;
  /** Disabled row state: dim opacity and disable pointer interactions */
  disabled?: boolean;
  /** Whether to show top border. Default true, with first:border-t-0 */
  borderTop?: boolean;
  /** Interactive clickable row */
  clickable?: boolean;
}

export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(
  (
    {
      children,
      className,
      leading,
      title,
      subtitle,
      trailing,
      amount,
      isCredit = false,
      chevron = false,
      kebab,
      highlighted = false,
      hl = false,
      disabled = false,
      borderTop = true,
      clickable = false,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      ...props
    },
    ref,
  ) => {
    const isHighlighted = highlighted || hl;
    const isInteractive = (clickable || !!onClick) && !disabled;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
    };

    return (
      <div
        ref={ref}
        role={role || (isInteractive ? 'button' : undefined)}
        tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
        aria-disabled={disabled ? true : undefined}
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex items-center gap-space-12 px-space-16 py-space-10 text-body relative transition-colors font-text',
          borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
          isHighlighted
            ? 'border-l-4 border-l-brand-strong bg-brand-tint'
            : 'border-l-4 border-l-transparent',
          disabled && 'opacity-50 pointer-events-none',
          isInteractive &&
            'cursor-pointer hover:bg-hover active:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
          className,
        )}
        {...props}
      >
        {leading && <div className="shrink-0 flex items-center">{leading}</div>}

        {title !== undefined ? (
          <div className="flex-1 min-w-0">
            <div className="text-body-strong font-bold text-ink truncate">{title}</div>
            {subtitle && (
              <div className="text-label font-medium text-ink-3 truncate mt-space-2">{subtitle}</div>
            )}
            {children}
          </div>
        ) : (
          children
        )}

        {(trailing || amount !== undefined || chevron || kebab) && (
          <div className="shrink-0 flex items-center gap-space-8 ml-auto">
            {amount !== undefined && (
              <span
                className={cn(
                  'tabular-nums text-body-strong font-bold text-right',
                  isCredit ? 'text-positive' : 'text-ink',
                )}
              >
                {isCredit && typeof amount === 'string' && !amount.startsWith('+')
                  ? `+${amount}`
                  : amount}
              </span>
            )}
            {trailing}
            {kebab && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="More options"
                onClick={
                  typeof kebab === 'function'
                    ? (e) => {
                        e.stopPropagation();
                        kebab();
                      }
                    : undefined
                }
                className="text-ink-4 hover:text-ink p-space-2 h-auto min-h-0"
              >
                <Icon icon={MoreVertical} size="sm" />
              </Button>
            )}
            {chevron && (
              <Icon
                icon={ChevronRight}
                size="sm"
                className="text-ink-4 shrink-0"
              />
            )}
          </div>
        )}
      </div>
    );
  },
);

ListRow.displayName = 'ListRow';

/**
 * ListField (fld): A label/value pair for detail sheets.
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
