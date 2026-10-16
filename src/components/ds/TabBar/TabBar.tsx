'use client';

import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { cn } from '../cn';
import { Icon, type IconName } from '../Icon/Icon';

export interface TabBarItem {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  count?: number;
  countTone?: 'danger' | 'warning';
}

export interface TabBarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'> {
  items: TabBarItem[];
  current?: string;
  onSelect?: (id: string) => void;
  hidden?: boolean;
}

/**
 * The phone tab bar: bottom navigation drawing the items the app gives it (at most 5).
 * Built from: Icon, Badge (count). Items are links with the current one marked.
 */
export const TabBar = forwardRef<HTMLElement, TabBarProps>(
  (
    {
      items = [],
      current,
      onSelect,
      hidden = false,
      className,
      ...props
    },
    ref,
  ) => {
    if (hidden) return null;

    const visibleItems = items.slice(0, 5);

    return (
      <nav
        ref={ref}
        aria-label="Primary"
        className={cn(
          'fixed inset-x-space-12 bottom-safe-12 z-dock flex items-center bg-surface border border-line rounded-ds-pill shadow-dock py-space-8 px-space-4 select-none lg:hidden',
          className,
        )}
        {...props}
      >
        {visibleItems.map((item) => {
          const isActive = current === item.id;
          const Tag = item.href ? 'a' : 'button';

          return (
            <Tag
              key={item.id}
              href={item.href}
              type={item.href ? undefined : 'button'}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                onSelect?.(item.id);
              }}
              className={cn(
                'flex-1 min-w-0 flex flex-col items-center justify-center gap-space-2 font-text text-tab-label transition-colors duration-fast cursor-pointer no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-ds-sm active:text-ink-3',
                isActive
                  ? 'text-ink'
                  : 'text-ink-faint',
              )}
            >
              <div className="relative inline-flex items-center justify-center">
                <Icon name={item.icon} size="lg" />
                {item.count !== undefined && item.count > 0 ? (
                  <Badge
                    variant="count"
                    tone={item.countTone}
                    count={item.count}
                    className="absolute -top-space-4 left-space-12 pointer-events-none ring-2 ring-surface"
                  />
                ) : null}
              </div>
              <span className={cn('truncate max-w-full', isActive && 'font-extrabold')}>
                {item.label}
              </span>
            </Tag>
          );
        })}
      </nav>
    );
  },
);

TabBar.displayName = 'TabBar';
