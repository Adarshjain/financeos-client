'use client';

import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { cn } from '../cn';
import { Icon, type IconName } from '../Icon/Icon';
import { formatCount } from '../utils';

export interface TabBarItem {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  count?: number;
  countTone?: 'danger' | 'warning';
  asChild?: boolean;
  children?: React.ReactNode;
}

export interface TabBarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'> {
  items: TabBarItem[];
  current?: string;
  onSelect?: (id: string) => void;
}

/**
 * The phone tab bar: bottom navigation drawing the items the app gives it (at most 5).
 * Built from: Icon, Badge (count), Slot. Items are buttons (or asChild links) with the current one marked.
 */
export const TabBar = forwardRef<HTMLElement, TabBarProps>(
  (
    {
      items = [],
      current,
      onSelect,
      className,
      ...props
    },
    ref,
  ) => {
    const visibleItems = items.slice(0, 5);

    return (
      <nav
        ref={ref}
        aria-label="Primary"
        className={cn(
          'fixed inset-x-space-12 bottom-safe-12 z-floating flex items-center bg-surface border border-line rounded-ds-pill shadow-up-1 py-space-8 px-space-4 select-none desk:hidden',
          className,
        )}
        {...props}
      >
        {visibleItems.map((item) => {
          const isActive = current === item.id;

          const content = (
            <>
              <div className="relative inline-flex items-center justify-center">
                <Icon name={item.icon} size="lg" />
                {item.count !== undefined && item.count > 0 ? (
                  <Badge
                    variant="solid"
                    shape="rounded"
                    size="sm"
                    tone={item.countTone}
                    className="absolute -top-space-4 left-space-12 pointer-events-none ring-2 ring-surface"
                  >
                    {formatCount(item.count)}
                  </Badge>
                ) : null}
              </div>
              <span className={cn('truncate max-w-full', isActive && 'font-extrabold')}>
                {item.label}
              </span>
            </>
          );

          const sharedClasses = cn(
            'flex-1 min-w-0 flex flex-col items-center justify-center gap-space-2 font-text text-micro transition-colors duration-fast cursor-pointer no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-ds-sm active:text-ink-3',
            isActive ? 'text-ink' : 'text-ink-faint',
          );

          const isSlot = item.asChild && React.isValidElement(item.children);
          const Comp = isSlot ? Slot : 'button';

          return (
            <Comp
              key={item.id}
              type={isSlot ? undefined : 'button'}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect?.(item.id)}
              className={sharedClasses}
            >
              {isSlot
                ? React.cloneElement(
                    item.children as React.ReactElement<{ children?: React.ReactNode }>,
                    undefined,
                    content,
                  )
                : content}
            </Comp>
          );
        })}
      </nav>
    );
  },
);

TabBar.displayName = 'TabBar';
