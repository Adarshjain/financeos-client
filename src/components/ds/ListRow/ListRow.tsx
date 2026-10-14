import { ChevronRight, MoreVertical } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface ListRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Leading element: Badge, Avatar, DateTile, IconTile, or custom node */
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
  /** Highlighted row (opened from notification): 2px brand outline on brand-tint */
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
          'flex items-center gap-space-12 px-space-16 py-space-10 text-body relative transition-colors',
          borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
          isHighlighted && 'ring-2 ring-inset ring-brand bg-brand-tint',
          disabled && 'opacity-50 pointer-events-none',
          isInteractive && 'cursor-pointer hover:bg-hover active:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
          className,
        )}
        {...props}
      >
        {leading && <div className="shrink-0 flex items-center">{leading}</div>}

        {title !== undefined ? (
          <div className="flex-1 min-w-0">
            <div className="font-bold text-body text-ink truncate">{title}</div>
            {subtitle && (
              <div className="text-caption text-ink-3 truncate">{subtitle}</div>
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
                  'tabular-nums font-bold text-body text-right',
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
              <button
                type="button"
                aria-label="More options"
                onClick={
                  typeof kebab === 'function'
                    ? (e) => {
                        e.stopPropagation();
                        kebab();
                      }
                    : undefined
                }
                className="text-ink-4 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring rounded-ds-sm p-space-2 inline-flex items-center justify-center transition-colors"
              >
                <MoreVertical className="w-space-14 h-space-14" aria-hidden="true" />
              </button>
            )}
            {chevron && (
              <ChevronRight
                className="w-space-14 h-space-14 text-ink-4 shrink-0"
                aria-hidden="true"
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
          'flex items-center justify-between gap-space-12 px-space-16 py-space-8 text-body',
          borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
          className,
        )}
        {...props}
      >
        <span className="text-ink-3 shrink-0">{label}</span>
        {value !== undefined ? (
          <span className="text-ink text-right min-w-0 break-words">{value}</span>
        ) : (
          children
        )}
      </div>
    );
  },
);

ListField.displayName = 'ListField';

/**
 * ListRowDateTile: Helper for leading date tiles in rows
 */
export interface ListRowDateTileProps extends React.HTMLAttributes<HTMLDivElement> {
  day: string | number;
  month: string;
}

export const ListRowDateTile = forwardRef<HTMLDivElement, ListRowDateTileProps>(
  ({ className, day, month, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-space-40 text-center shrink-0 flex flex-col items-center justify-center',
          className,
        )}
        {...props}
      >
        <b className="block font-extrabold text-heading text-ink leading-none">
          {day}
        </b>
        <span className="block font-extrabold text-overline text-ink-4 uppercase tracking-wider">
          {month}
        </span>
      </div>
    );
  },
);

ListRowDateTile.displayName = 'ListRowDateTile';

/**
 * ListRowIconTile: Helper for icon/short abbreviation tiles in rows
 */
export type IconTileTone =
  | 'default'
  | 'info'
  | 'positive'
  | 'warning'
  | 'danger'
  | 'brand';

export interface ListRowIconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: IconTileTone;
}

export const ListRowIconTile = forwardRef<HTMLSpanElement, ListRowIconTileProps>(
  ({ children, className, tone = 'default', ...props }, ref) => {
    const toneStyles: Record<IconTileTone, string> = {
      default: 'bg-canvas text-ink-2',
      info: 'bg-info-tint text-info',
      positive: 'bg-positive-tint text-positive-strong',
      warning: 'bg-warning-tint text-warning-ink',
      danger: 'bg-danger-tint text-danger',
      brand: 'bg-brand-tint text-brand-strong',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'w-space-32 h-space-32 rounded-ds-md shrink-0 flex items-center justify-center font-extrabold text-label select-none',
          toneStyles[tone],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

ListRowIconTile.displayName = 'ListRowIconTile';
