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
          'flex items-center px-space-8 pt-space-8 pb-space-14 bg-surface border-t border-line min-h-tab-bar select-none',
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
              onClick={(e) => {
                if (onSelect) {
                  e.preventDefault();
                  onSelect(item.id);
                }
              }}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-space-2 font-text text-tab-label font-bold transition-colors duration-fast cursor-pointer no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-ds-sm py-space-2',
                isActive
                  ? 'text-brand-strong font-extrabold'
                  : 'text-ink-4 hover:text-ink hover:bg-hover active:bg-pressed',
              )}
            >
              <div className="relative inline-flex items-center justify-center">
                <Icon name={item.icon} size="lg" />
                {item.count !== undefined && item.count > 0 ? (
                  <Badge
                    variant="count"
                    tone={item.countTone}
                    count={item.count}
                    className="absolute -top-space-4 left-space-14 pointer-events-none"
                  />
                ) : null}
              </div>
              <span className="truncate max-w-full">{item.label}</span>
            </Tag>
          );
        })}
      </nav>
    );
  },
);

TabBar.displayName = 'TabBar';
