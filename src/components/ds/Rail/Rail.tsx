'use client';

import {
  Calendar,
  CreditCard,
  Home,
  Inbox,
  MessageSquare,
  Receipt,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { forwardRef } from 'react';

import { BrandMark } from '../AppBar/AppBar';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { Kbd } from '../Kbd/Kbd';

export interface RailNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  count?: number | string;
  countTone?: 'danger' | 'warning' | 'ink';
}

export interface RailGroup {
  label?: string;
  items: RailNavItem[];
}

export interface RailUser {
  name?: string;
  email?: string;
  avatar?: string;
  initials?: string;
}

export interface RailProps extends React.HTMLAttributes<HTMLElement> {
  items?: RailGroup[];
  current?: string;
  onNavigate?: (href: string) => void;
  onSearch?: () => void;
  user?: RailUser;
  brandHref?: string;
}

export const defaultRailGroups: RailGroup[] = [
  {
    items: [
      { href: '/', label: 'Home', icon: <Icon icon={Home} size="lg" /> },
      {
        href: '/inbox',
        label: 'Inbox',
        icon: <Icon icon={Inbox} size="lg" />,
        count: 9,
        countTone: 'danger',
      },
      {
        href: '/upcoming',
        label: 'Upcoming',
        icon: <Icon icon={Calendar} size="lg" />,
      },
    ],
  },
  {
    label: 'Money',
    items: [
      {
        href: '/accounts',
        label: 'Accounts',
        icon: <Icon icon={CreditCard} size="lg" />,
      },
      {
        href: '/transactions',
        label: 'Transactions',
        icon: <Icon icon={Receipt} size="lg" />,
        count: 25,
        countTone: 'warning',
      },
    ],
  },
  {
    label: 'Grow',
    items: [
      {
        href: '/investments',
        label: 'Investments',
        icon: <Icon icon={TrendingUp} size="lg" />,
      },
      {
        href: '/rewards',
        label: 'Rewards',
        icon: <Icon icon={Sparkles} size="lg" />,
      },
    ],
  },
  {
    label: 'Owe & lend',
    items: [
      {
        href: '/loans',
        label: 'Loans & lendings',
        icon: <Icon icon={Users} size="lg" />,
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        href: '/chat',
        label: 'Ask the data',
        icon: <Icon icon={MessageSquare} size="lg" />,
      },
    ],
  },
];

/**
 * Desktop left navigation, 240px (`w-rail`).
 * Brand row, search shortcut with ⌘K, navigation sections with overline headers,
 * and user profile pinned at the bottom.
 */
export const Rail = forwardRef<HTMLElement, RailProps>(
  (
    {
      items = defaultRailGroups,
      current = '/',
      onNavigate,
      onSearch,
      user,
      brandHref = '/',
      className,
      ...props
    },
    ref,
  ) => {
    const derivedInitials =
      user?.initials ??
      (user?.name
        ? user.name
            .split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : 'AM');

    return (
      <nav
        ref={ref}
        aria-label="Primary"
        className={cn(
          'w-rail min-w-rail bg-surface border-r border-line p-space-12 flex flex-col h-full text-body select-none',
          className,
        )}
        {...props}
      >
        {/* Brand row */}
        <a
          href={brandHref}
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate(brandHref);
            }
          }}
          className="flex items-center gap-space-10 px-space-6 py-space-10 text-ink rounded-ds-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring mb-space-8"
        >
          <BrandMark />
          <span className="font-extrabold text-heading text-ink">
            FinanceOS
          </span>
        </a>

        {/* Search button */}
        {onSearch ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onSearch}
            className="w-full justify-start text-ink-3 bg-sunken border-line-soft hover:bg-hover active:bg-hover font-medium px-space-10 mb-space-12 gap-space-8"
          >
            <Icon icon={Search} size="md" className="shrink-0 text-ink-3" />
            <span className="text-label text-ink-3">Search</span>
            <span className="ml-auto">
              <Kbd>⌘K</Kbd>
            </span>
          </Button>
        ) : null}

        {/* Grouped navigation items */}
        <div className="flex-1 space-y-space-12 overflow-y-auto">
          {items.map((group, gIdx) => (
            <div key={gIdx} className="space-y-space-2">
              {group.label ? (
                <div className="px-space-8 py-space-4 text-overline font-extrabold text-ink-4 uppercase tracking-wider">
                  {group.label}
                </div>
              ) : null}

              {group.items.map((item) => {
                const isCurrent = current === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      if (onNavigate) {
                        e.preventDefault();
                        onNavigate(item.href);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-space-8 px-space-8 py-space-6 rounded-ds-md text-body font-semibold transition-colors duration-fast',
                      isCurrent
                        ? 'bg-brand-tint text-brand-strong'
                        : 'text-ink-2 hover:bg-hover hover:text-ink',
                    )}
                  >
                    {item.icon ? (
                      <span
                        className={cn(
                          'shrink-0',
                          isCurrent ? 'text-brand-strong' : 'text-ink-3',
                        )}
                      >
                        {item.icon}
                      </span>
                    ) : null}

                    <span className="flex-1 truncate">{item.label}</span>

                    {item.count !== undefined && item.count !== null ? (
                      item.countTone === 'warning' ? (
                        <span className="text-caption font-bold text-warning ml-auto">
                          {item.count}
                        </span>
                      ) : (
                        <Badge
                          variant="count"
                          count={item.count}
                          tone={item.countTone === 'danger' ? 'danger' : 'ink'}
                          className="ml-auto"
                        />
                      )
                    ) : null}
                  </a>
                );
              })}
            </div>
          ))}
        </div>

        {/* Pinned settings and user profile footer */}
        <div className="mt-auto pt-space-12 border-t border-line-soft flex items-center justify-between">
          <a
            href="/settings"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('/settings');
              }
            }}
            className={cn(
              'flex items-center gap-space-8 px-space-8 py-space-6 rounded-ds-md text-body font-semibold transition-colors duration-fast text-ink-2 hover:bg-hover hover:text-ink',
              current === '/settings' && 'bg-brand-tint text-brand-strong',
            )}
          >
            <Icon icon={Settings} size="lg" />
            <span>Settings</span>
          </a>

          <Avatar
            size="sm"
            src={user?.avatar}
            initials={derivedInitials}
          >
            {derivedInitials}
          </Avatar>
        </div>
      </nav>
    );
  },
);

Rail.displayName = 'Rail';
