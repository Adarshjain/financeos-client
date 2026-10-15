'use client';

import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { cn } from '../cn';
import { Icon, type IconName } from '../Icon/Icon';

export type TabBarTabId =
  | 'home'
  | 'inbox'
  | 'upcoming'
  | 'transactions'
  | 'more';

export interface TabBarItemDef {
  id: TabBarTabId;
  label: string;
  icon: IconName;
  href?: string;
  count?: number;
  countTone?: 'danger' | 'warning';
}

export function formatBadgeCount(count?: number): string | null {
  if (count === undefined || count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
}

export interface TabBarProps extends React.HTMLAttributes<HTMLElement> {
  activeTab?: TabBarTabId;
  onTabChange?: (tab: TabBarTabId) => void;
  inboxCount?: number;
  transactionsCount?: number;
  hidden?: boolean;
  getHref?: (tabId: TabBarTabId) => string;
}

const defaultHrefs: Record<TabBarTabId, string> = {
  home: '/',
  inbox: '/inbox',
  upcoming: '/upcoming',
  transactions: '/transactions',
  more: '/more',
};

/**
 * The phone tab bar: Home · Inbox · Upcoming · Transactions · More,
 * always in that order. Shown on every top-level phone screen;
 * hidden while a list is in selection mode and under the keyboard.
 *
 * Built from: Icon, Badge (count). Items are links with the current one marked.
 */
export const TabBar = forwardRef<HTMLElement, TabBarProps>(
  (
    {
      activeTab = 'home',
      onTabChange,
      inboxCount,
      transactionsCount,
      hidden = false,
      getHref,
      className,
      ...props
    },
    ref,
  ) => {
    if (hidden) return null;

    const tabs: TabBarItemDef[] = [
      { id: 'home', label: 'Home', icon: 'home' },
      {
        id: 'inbox',
        label: 'Inbox',
        icon: 'inbox',
        count: inboxCount,
        countTone: 'danger',
      },
      { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
      {
        id: 'transactions',
        label: 'Transactions',
        icon: 'transactions',
        count: transactionsCount,
        countTone: 'warning',
      },
      { id: 'more', label: 'More', icon: 'menu' },
    ];

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
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const href = getHref ? getHref(tab.id) : tab.href || defaultHrefs[tab.id];

          return (
            <a
              key={tab.id}
              href={href}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => {
                if (onTabChange) {
                  e.preventDefault();
                  onTabChange(tab.id);
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
                <Icon name={tab.icon} size="lg" />
                {tab.count !== undefined && tab.count > 0 ? (
                  <Badge
                    variant="count"
                    tone={tab.countTone}
                    count={tab.count}
                    className="absolute -top-space-4 left-space-14 pointer-events-none"
                  />
                ) : null}
              </div>
              <span className="truncate max-w-full">{tab.label}</span>
            </a>
          );
        })}
      </nav>
    );
  },
);

TabBar.displayName = 'TabBar';
