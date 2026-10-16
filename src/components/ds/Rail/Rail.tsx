'use client';

import React, { forwardRef } from 'react';

import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon, type IconName } from '../Icon/Icon';
import { Kbd } from '../Kbd/Kbd';
import { Logo } from '../Logo/Logo';

export interface RailItem {
  id?: string;
  label: string;
  icon?: IconName;
  href?: string;
  count?: number | string;
  countTone?: 'danger' | 'warning' | 'ink';
  onSelect?: () => void;
}

export interface RailGroup {
  label?: string;
  items: RailItem[];
}

export interface RailUser {
  name?: string;
  email?: string;
  avatar?: string;
  initials?: string;
}

export interface RailSearchConfig {
  onSearch?: () => void;
  shortcut?: string;
  label?: string;
}

export interface RailProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'> {
  groups?: RailGroup[];
  current?: string;
  search?: RailSearchConfig | (() => void);
  footer?: RailItem[];
  user?: RailUser;
  brandHref?: string;
  onNavigate?: (href: string) => void;
  onSelect?: (idOrHref: string) => void;
}

/**
 * Desktop left navigation, 240px (`w-container-xs`).
 * Brand row, search shortcut with ⌘K, navigation sections with overline headers,
 * and user profile pinned at the bottom.
 *
 * Takes all groups, items, routes, search config and user from props.
 */
export const Rail = forwardRef<HTMLElement, RailProps>(
  (
    {
      groups = [],
      current,
      search,
      footer,
      user,
      brandHref,
      onNavigate,
      onSelect,
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
          'w-container-xs min-w-container-xs bg-surface border-r border-line p-space-12 flex flex-col h-full text-body select-none',
          className,
        )}
        {...props}
      >
        {/* Brand row */}
        {brandHref ? (
          <a
            href={brandHref}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate(brandHref);
              }
            }}
            className="flex items-center px-space-6 py-space-10 text-ink rounded-ds-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring mb-space-8 no-underline"
          >
            <Logo variant="full" size="sm" />
          </a>
        ) : (
          <div className="flex items-center px-space-6 py-space-10 text-ink rounded-ds-md mb-space-8">
            <Logo variant="full" size="sm" />
          </div>
        )}

        {/* Search button */}
        {search ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={typeof search === 'function' ? search : search.onSearch}
            className="w-full justify-start text-ink-3 bg-sunken border-line-soft hover:bg-hover active:bg-pressed font-medium px-space-10 mb-space-12 gap-space-8"
          >
            <Icon name="search" size="md" className="shrink-0 text-ink-3" />
            <span className="text-label text-ink-3">
              {typeof search === 'object' && search.label ? search.label : 'Search'}
            </span>
            <span className="ml-auto">
              <Kbd>{typeof search === 'object' && search.shortcut ? search.shortcut : '⌘K'}</Kbd>
            </span>
          </Button>
        ) : null}

        {/* Grouped navigation items */}
        <div className="flex-1 space-y-space-12 overflow-y-auto">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-space-2">
              {group.label ? (
                <div className="px-space-8 py-space-4 text-overline font-extrabold text-ink-4 uppercase tracking-wider">
                  {group.label}
                </div>
              ) : null}

              {group.items.map((item) => {
                const isCurrent = current === item.href || (item.id && current === item.id);
                const Tag = item.href ? 'a' : 'button';

                return (
                  <Tag
                    key={item.id || item.href || item.label}
                    href={item.href}
                    type={item.href ? undefined : 'button'}
                    onClick={(e) => {
                      if (item.onSelect) {
                        if (!item.href) e.preventDefault();
                        item.onSelect();
                      } else if (onSelect) {
                        e.preventDefault();
                        onSelect(item.id || item.href || '');
                      } else if (onNavigate && item.href) {
                        e.preventDefault();
                        onNavigate(item.href);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-space-8 px-space-8 py-space-6 rounded-ds-md text-body font-semibold transition-colors duration-fast text-left no-underline cursor-pointer',
                      isCurrent
                        ? 'bg-brand-tint text-brand-strong'
                        : 'text-ink-2 hover:bg-hover hover:text-ink active:bg-pressed',
                    )}
                  >
                    {item.icon ? (
                      <span
                        className={cn(
                          'shrink-0',
                          isCurrent ? 'text-brand-strong' : 'text-ink-3',
                        )}
                      >
                        <Icon name={item.icon} size="lg" />
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
                  </Tag>
                );
              })}
            </div>
          ))}
        </div>

        {/* Pinned footer and user profile */}
        {(footer || user) && (
          <div className="mt-auto pt-space-12 border-t border-line-soft flex items-center justify-between">
            <div className="flex items-center gap-space-4 min-w-0">
              {footer?.map((item) => {
                const isCurrent = current === item.href || (item.id && current === item.id);
                const Tag = item.href ? 'a' : 'button';

                return (
                  <Tag
                    key={item.id || item.href || item.label}
                    href={item.href}
                    type={item.href ? undefined : 'button'}
                    onClick={(e) => {
                      if (item.onSelect) {
                        if (!item.href) e.preventDefault();
                        item.onSelect();
                      } else if (onSelect) {
                        e.preventDefault();
                        onSelect(item.id || item.href || '');
                      } else if (onNavigate && item.href) {
                        e.preventDefault();
                        onNavigate(item.href);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-space-8 px-space-8 py-space-6 rounded-ds-md text-body font-semibold transition-colors duration-fast text-ink-2 hover:bg-hover hover:text-ink active:bg-pressed no-underline cursor-pointer',
                      isCurrent && 'bg-brand-tint text-brand-strong',
                    )}
                  >
                    {item.icon ? <Icon name={item.icon} size="lg" /> : null}
                    <span>{item.label}</span>
                  </Tag>
                );
              })}
            </div>

            {user && (
              <Avatar
                variant="person"
                size="sm"
                src={user.avatar}
                initials={derivedInitials}
              >
                {derivedInitials}
              </Avatar>
            )}
          </div>
        )}
      </nav>
    );
  },
);

Rail.displayName = 'Rail';
