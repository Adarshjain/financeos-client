'use client';

import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { Icon } from '../Icon/Icon';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../Menu/Menu';

export { ListField, type ListFieldProps } from '../ListField/ListField';

export interface ListRowAction {
  id: string;
  label: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

export interface ListRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** If true, delegates rendering to immediate child using Radix Slot */
  asChild?: boolean;
  /** Leading element: Badge, Avatar, DateTile, or custom node */
  leading?: React.ReactNode;
  /** Primary text/title */
  title?: React.ReactNode;
  /** Secondary context text */
  subtitle?: React.ReactNode;
  /** Trailing element: action button, icon, etc. */
  trailing?: React.ReactNode;
  /** If true, appends a chevron arrow indicator at the end */
  chevron?: boolean;
  /** Actions rendered in a trailing kebab (More options) menu */
  actions?: ListRowAction[];
  /** Highlighted row (current, or opened from a notification): the brand-tint ground, no stripe (owner, 2026-10-26) */
  highlighted?: boolean;
  /** Disabled row state: dim opacity and disable pointer interactions */
  disabled?: boolean;
  /** Whether to show top border. Default true, with first:border-t-0 */
  borderTop?: boolean;
  /** Interactive clickable row */
  clickable?: boolean;
  /** If true, title and subtitle wrap instead of truncating */
  wrap?: boolean;
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
      chevron = false,
      actions,
      highlighted = false,
      disabled = false,
      borderTop = true,
      clickable = false,
      wrap = false,
      asChild = false,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      ...props
    },
    ref,
  ) => {
    const isHighlighted = highlighted;
    const isInteractive = (asChild || clickable || !!onClick) && !disabled;

    const handleKeyDown = asChild
      ? onKeyDown
      : (e: React.KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(e);
          if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        };

    const classes = cn(
      'flex items-center gap-space-12 px-space-16 py-space-10 text-body relative transition-colors font-text no-underline text-inherit',
      borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
      // The transparent 4px left border keeps rows aligned with DataTable rows, whose warning tone has a stripe.
      'border-l-4 border-l-transparent',
      isHighlighted && 'bg-brand-tint',
      disabled && 'opacity-50 pointer-events-none',
      isInteractive &&
        'cursor-pointer hover:bg-hover active-self:bg-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
      className,
    );

    const renderTrailing = () => {
      const hasActions = actions && actions.length > 0;
      if (!trailing && !chevron && !hasActions) return null;
      return (
        <div className="shrink-0 flex items-center gap-space-8 ml-auto tabular-nums">
          {concealMoney(trailing)}
          {hasActions && (
            <MenuRoot>
              <MenuTrigger
                asChild
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label="More options"
                  icon={<Icon name="more" size="sm" />}
                  className="text-ink-4 hover:text-ink p-space-2 h-auto min-h-0"
                />
              </MenuTrigger>
              <MenuContent align="end">
                {actions.map((act) => (
                  <MenuItem
                    key={act.id}
                    onSelect={() => act.onSelect()}
                    destructive={act.destructive}
                  >
                    {act.label}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>
          )}
          {chevron && (
            <Icon
              name="chevron-right"
              size="sm"
              className="text-ink-4 shrink-0"
            />
          )}
        </div>
      );
    };

    // A server page's element can arrive as a React lazy reference (dev RSC streaming), which isValidElement
    // rejects; Children.toArray resolves it to the element.
    const only = asChild ? React.Children.toArray(children) : [];
    const asChildElement = only.length === 1 && React.isValidElement(only[0]) ? only[0] : null;
    if (asChildElement) {
      const child = asChildElement as React.ReactElement<{ children?: React.ReactNode }>;
      const innerContent = (
        <>
          {leading && <div className="shrink-0 flex items-center">{leading}</div>}

          {title !== undefined ? (
            <div className="flex-1 min-w-0">
              <div className={cn('text-body-strong font-bold text-ink', wrap ? 'break-words' : 'truncate')}>{concealMoney(title)}</div>
              {subtitle && (
                <div className={cn('text-label font-medium text-ink-3 mt-space-2', wrap ? 'break-words' : 'truncate')}>{concealMoney(subtitle)}</div>
              )}
              {child.props.children}
            </div>
          ) : (
            child.props.children
          )}

          {renderTrailing()}
        </>
      );

      return (
        <Slot
          ref={ref}
          role={role}
          tabIndex={tabIndex}
          aria-disabled={disabled ? true : undefined}
          onClick={disabled ? undefined : onClick}
          onKeyDown={handleKeyDown}
          className={classes}
          {...props}
        >
          {React.cloneElement(child, {}, innerContent)}
        </Slot>
      );
    }

    return (
      <div
        ref={ref}
        role={role || (isInteractive ? 'button' : undefined)}
        tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
        aria-disabled={disabled ? true : undefined}
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
        className={classes}
        {...props}
      >
        {leading && <div className="shrink-0 flex items-center">{leading}</div>}

        {title !== undefined ? (
          <div className="flex-1 min-w-0">
            <div className={cn('text-body-strong font-bold text-ink', wrap ? 'break-words' : 'truncate')}>{concealMoney(title)}</div>
            {subtitle && (
              <div className={cn('text-label font-medium text-ink-3 mt-space-2', wrap ? 'break-words' : 'truncate')}>{concealMoney(subtitle)}</div>
            )}
            {children}
          </div>
        ) : (
          children
        )}

        {renderTrailing()}
      </div>
    );
  },
);

ListRow.displayName = 'ListRow';
