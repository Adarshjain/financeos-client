import { Calendar, Home, Inbox, Menu } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type TabBarTabId =
  | 'home'
  | 'inbox'
  | 'upcoming'
  | 'transactions'
  | 'more';

export interface TabBarItemDef {
  id: TabBarTabId;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  count?: number;
  countTone?: 'danger' | 'warning';
}

function TransactionsIcon({
  className,
  'aria-hidden': ariaHidden,
}: {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
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
}

/**
 * The phone tab bar: Home · Inbox · Upcoming · Transactions · More,
 * always in that order. Shown on every top-level phone screen;
 * hidden while in selection mode and under the keyboard.
 */
export const TabBar = forwardRef<HTMLElement, TabBarProps>(
  (
    {
      activeTab = 'home',
      onTabChange,
      inboxCount,
      transactionsCount,
      hidden = false,
      className,
      ...props
    },
    ref,
  ) => {
    if (hidden) return null;

    const tabs: TabBarItemDef[] = [
      { id: 'home', label: 'Home', icon: Home },
      {
        id: 'inbox',
        label: 'Inbox',
        icon: Inbox,
        count: inboxCount,
        countTone: 'danger',
      },
      { id: 'upcoming', label: 'Upcoming', icon: Calendar },
      {
        id: 'transactions',
        label: 'Transactions',
        icon: TransactionsIcon,
        count: transactionsCount,
        countTone: 'warning',
      },
      { id: 'more', label: 'More', icon: Menu },
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
          const Icon = tab.icon;
          const badgeText = formatBadgeCount(tab.count);

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-space-2 text-tab-label font-bold transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-ds-sm py-space-2',
                isActive
                  ? 'text-brand-strong font-extrabold'
                  : 'text-ink-4 hover:text-ink',
              )}
            >
              <div className="relative inline-flex items-center justify-center">
                <Icon
                  className="w-space-20 h-space-20 shrink-0"
                  aria-hidden={true}
                />
                {badgeText ? (
                  <span
                    className={cn(
                      'absolute -top-space-4 left-space-14 min-w-space-16 h-space-16 px-space-4 rounded-ds-pill flex items-center justify-center text-overline font-extrabold text-on-brand leading-none pointer-events-none',
                      tab.countTone === 'warning' ? 'bg-warning' : 'bg-danger',
                    )}
                  >
                    {badgeText}
                  </span>
                ) : null}
              </div>
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    );
  },
);
TabBar.displayName = 'TabBar';
