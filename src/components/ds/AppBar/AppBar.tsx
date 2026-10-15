import {
  Bell,
  ChevronLeft,
  MessageSquare,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import React, { forwardRef } from 'react';

import { Avatar } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Kbd } from '../Kbd/Kbd';

export interface BrandMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  symbol?: string;
}

export const BrandMark = forwardRef<HTMLSpanElement, BrandMarkProps>(
  ({ className, symbol = '₹', ...props }, ref) => {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={cn(
          'w-space-28 h-space-28 rounded-ds-md bg-brand text-on-brand flex items-center justify-center font-extrabold text-heading shrink-0 select-none',
          className,
        )}
        {...props}
      >
        {symbol}
      </span>
    );
  },
);
BrandMark.displayName = 'BrandMark';

export interface AppBarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  backAriaLabel?: string;
  onAsk?: () => void;
  onSearch?: () => void;
  onAdd?: () => void;
  addAriaLabel?: string;
  showActions?: boolean;
  rightActions?: React.ReactNode;
  brandHref?: string;
}

/**
 * The phone app bar: brand mark (or back arrow on detail screens),
 * breadcrumb and screen title, Ask the data, Search, and the page-aware Add button.
 * Every phone screen has exactly one. Replaces body title.
 */
export const AppBar = forwardRef<HTMLElement, AppBarProps>(
  (
    {
      title,
      crumb,
      back = false,
      onBack,
      backAriaLabel = 'Back',
      onAsk,
      onSearch,
      onAdd,
      addAriaLabel = 'Add',
      showActions = true,
      rightActions,
      brandHref,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          'flex items-center gap-space-8 px-space-12 py-space-10 bg-surface border-b border-line min-h-app-bar text-body select-none',
          className,
        )}
        {...props}
      >
        {back ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={backAriaLabel}
            onClick={onBack}
            className="shrink-0"
          >
            <ChevronLeft className="w-space-16 h-space-16" aria-hidden="true" />
          </Button>
        ) : brandHref ? (
          <a
            href={brandHref}
            aria-label="FinanceOS home"
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-ds-md"
          >
            <BrandMark />
          </a>
        ) : (
          <BrandMark />
        )}

        <div className="flex-1 min-w-0 pr-space-4">
          {crumb ? (
            <div className="text-overline font-semibold text-ink-4 uppercase tracking-wider leading-none mb-space-2 truncate">
              {crumb}
            </div>
          ) : null}
          <div className="text-title font-extrabold text-ink leading-tight truncate">
            {title}
          </div>
        </div>

        {rightActions ? (
          <div className="flex items-center gap-space-4 shrink-0">
            {rightActions}
          </div>
        ) : showActions ? (
          <div className="flex items-center gap-space-4 shrink-0">
            {onAsk ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Ask the data"
                onClick={onAsk}
              >
                <MessageSquare
                  className="w-space-16 h-space-16"
                  aria-hidden="true"
                />
              </Button>
            ) : null}
            {onSearch ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Search"
                onClick={onSearch}
              >
                <Search className="w-space-16 h-space-16" aria-hidden="true" />
              </Button>
            ) : null}
            {onAdd ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                iconOnly
                aria-label={addAriaLabel}
                onClick={onAdd}
              >
                <Plus className="w-space-16 h-space-16" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>
    );
  },
);
AppBar.displayName = 'AppBar';

export interface DesktopTopBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  onAdd?: () => void;
  addLabel?: React.ReactNode;
  onAsk?: () => void;
  onNotifications?: () => void;
  rightActions?: React.ReactNode;
}

/**
 * Desktop top bar: screen title and global desktop action controls.
 */
export const DesktopTopBar = forwardRef<HTMLDivElement, DesktopTopBarProps>(
  (
    {
      title,
      onAdd,
      addLabel,
      onAsk,
      onNotifications,
      rightActions,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          'flex items-center gap-space-16 px-space-24 py-space-12 bg-surface border-b border-line min-h-app-bar select-none',
          className,
        )}
        {...props}
      >
        <div className="text-page-title font-extrabold text-ink leading-tight truncate">
          {title}
        </div>

        <div className="ml-auto flex items-center gap-space-8 shrink-0">
          {rightActions ? (
            rightActions
          ) : (
            <>
              {onAdd ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onAdd}
                  className="gap-space-6"
                >
                  <Plus className="w-space-14 h-space-14" aria-hidden="true" />
                  {addLabel ?? (
                    <span className="flex items-center gap-space-6">
                      Add <Kbd>⌘N</Kbd>
                    </span>
                  )}
                </Button>
              ) : null}

              {onAsk ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label="Ask the data"
                  onClick={onAsk}
                >
                  <MessageSquare
                    className="w-space-16 h-space-16"
                    aria-hidden="true"
                  />
                </Button>
              ) : null}

              {onNotifications ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label="Notifications"
                  onClick={onNotifications}
                >
                  <Bell className="w-space-16 h-space-16" aria-hidden="true" />
                </Button>
              ) : null}
            </>
          )}
        </div>
      </header>
    );
  },
);
DesktopTopBar.displayName = 'DesktopTopBar';

export interface DesktopRailNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  badgeTone?: 'neutral' | 'danger' | 'warning';
}

export interface DesktopRailGroup {
  label?: string;
  items: DesktopRailNavItem[];
}

export interface DesktopRailProps extends React.HTMLAttributes<HTMLElement> {
  activeHref?: string;
  onNavigate?: (href: string) => void;
  onSearch?: () => void;
  userName?: string;
  userInitials?: string;
  groups?: DesktopRailGroup[];
}

/**
 * Desktop navigation rail: brand header, search shortcut, grouped navigation links,
 * and bottom user profile footer.
 */
export const DesktopRail = forwardRef<HTMLElement, DesktopRailProps>(
  (
    {
      activeHref = '/',
      onNavigate,
      onSearch,
      userName = 'Arjun Mehta',
      userInitials = 'AM',
      groups,
      className,
      ...props
    },
    ref,
  ) => {
    const defaultGroups: DesktopRailGroup[] = [
      {
        items: [
          { href: '/', label: 'Home' },
          { href: '/inbox', label: 'Inbox', badge: '9', badgeTone: 'danger' },
          { href: '/upcoming', label: 'Upcoming' },
        ],
      },
      {
        label: 'Money',
        items: [
          { href: '/accounts', label: 'Accounts' },
          {
            href: '/transactions',
            label: 'Transactions',
            badge: '25',
            badgeTone: 'warning',
          },
        ],
      },
      {
        label: 'Grow',
        items: [
          { href: '/investments', label: 'Investments' },
          { href: '/rewards', label: 'Rewards' },
        ],
      },
      {
        label: 'Owe & lend',
        items: [{ href: '/loans', label: 'Loans & lendings' }],
      },
      {
        label: 'Insights',
        items: [
          { href: '/dashboards', label: 'Dashboards' },
          { href: '/reports', label: 'Reports' },
          { href: '/chat', label: 'Ask the data' },
        ],
      },
    ];

    const railGroups = groups ?? defaultGroups;

    return (
      <nav
        ref={ref}
        aria-label="Primary"
        className={cn(
          'w-rail min-w-rail bg-surface border-r border-line p-space-12 flex flex-col min-h-screen text-body select-none',
          className,
        )}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate('/');
            }
          }}
          className="flex items-center gap-space-10 px-space-6 py-space-10 text-ink rounded-ds-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring mb-space-8"
        >
          <BrandMark />
          <span className="font-extrabold text-heading text-ink">
            FinanceOS
          </span>
        </a>

        {onSearch ? (
          <button
            type="button"
            onClick={onSearch}
            className="flex items-center gap-space-8 px-space-10 h-control-md text-label text-ink-3 bg-sunken rounded-ds-md border border-line-soft hover:bg-hover active:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring mb-space-12"
          >
            <Search className="w-space-14 h-space-14" aria-hidden="true" />
            <span>Search</span>
            <span className="ml-auto">
              <Kbd>⌘K</Kbd>
            </span>
          </button>
        ) : null}

        <div className="flex-1 space-y-space-16 overflow-y-auto">
          {railGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-space-2">
              {group.label ? (
                <div className="px-space-8 py-space-4 text-overline font-semibold text-ink-4 uppercase tracking-wider">
                  {group.label}
                </div>
              ) : null}
              {group.items.map((item) => {
                const isActive = activeHref === item.href;
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
                      'flex items-center gap-space-8 px-space-8 py-space-6 rounded-ds-md text-body font-medium transition-colors duration-fast',
                      isActive
                        ? 'bg-sunken text-ink font-semibold'
                        : 'text-ink-2 hover:bg-hover hover:text-ink',
                    )}
                  >
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          'ml-auto text-overline font-bold px-space-6 py-space-2 rounded-ds-pill',
                          item.badgeTone === 'danger'
                            ? 'bg-danger text-on-brand'
                            : item.badgeTone === 'warning'
                              ? 'text-warning font-extrabold'
                              : 'bg-sunken text-ink-2',
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </a>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-auto pt-space-12 border-t border-line-soft flex items-center gap-space-8 px-space-6">
          <a
            href="/settings"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('/settings');
              }
            }}
            className="flex items-center gap-space-6 text-ink-3 hover:text-ink text-label py-space-4"
          >
            <Settings className="w-space-16 h-space-16" aria-hidden="true" />
            <span>Settings</span>
          </a>
          <div className="ml-auto">
            <Avatar initials={userInitials} alt={userName} size="sm" />
          </div>
        </div>
      </nav>
    );
  },
);
DesktopRail.displayName = 'DesktopRail';
