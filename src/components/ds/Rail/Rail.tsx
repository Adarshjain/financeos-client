'use client';

import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon, type IconName } from '../Icon/Icon';
import { Tooltip } from '../Tooltip/Tooltip';
import { useControllableState } from '../useControllableState';
import { formatCount } from '../utils';

export interface RailItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
  countTone?: 'danger' | 'warning' | 'neutral' | 'ink';
  asChild?: boolean;
  children?: React.ReactNode;
  onSelect?: () => void;
}

export interface RailGroup {
  label?: string;
  items: RailItem[];
}

export interface RailProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'> {
  groups?: RailGroup[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSelect?: (id: string) => void;
  brand?: React.ReactNode;
  search?: React.ReactNode;
  footer?: React.ReactNode;
  /** Adds the toggle that shrinks the rail to an icon-only strip. Off: the rail renders as a fixed 240px column. */
  collapsible?: boolean;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Shown after the toggle's tooltip, e.g. `⌘B`. */
  toggleShortcut?: string;
}

function renderIcon(icon: React.ReactNode) {
  if (!icon) return null;
  if (typeof icon === 'string') {
    return <Icon name={icon as IconName} size="lg" />;
  }
  return icon;
}

/**
 * Desktop left navigation, 240px (`w-container-xs`); 64px (`w-space-64`) when collapsed.
 * Built from: Icon, Badge, Button, Tooltip, Slot.
 * Takes brand, search, navigation groups, and footer slots from props. Collapsed, the brand and group labels
 * are hidden, items show their icon only (label as tooltip), and the search and footer slots are the caller's to shrink.
 */
export const Rail = forwardRef<HTMLElement, RailProps>(
  (
    {
      groups = [],
      value,
      defaultValue,
      onValueChange,
      onSelect,
      brand,
      search,
      footer,
      collapsible = false,
      collapsed: collapsedProp,
      defaultCollapsed,
      onCollapsedChange,
      toggleShortcut,
      className,
      ...props
    },
    ref,
  ) => {
    const [collapsedState, setCollapsed] = useControllableState<boolean>({
      value: collapsedProp,
      defaultValue: defaultCollapsed ?? false,
      onChange: onCollapsedChange,
    });
    const collapsed = collapsible && collapsedState;

    const [currentValue, setCurrentValue] = useControllableState<string>({
      value,
      defaultValue,
      onChange: onValueChange,
    });

    const handleItemClick = (item: RailItem) => {
      item.onSelect?.();
      onSelect?.(item.id);
      setCurrentValue(item.id);
    };

    const renderItem = (item: RailItem) => {
      const isCurrent = currentValue === item.id;
      const isSlot = item.asChild && React.isValidElement(item.children);
      const Comp = isSlot ? Slot : 'button';

      const content = (
        <>
          {item.icon ? (
            <span
              className={cn(
                'shrink-0',
                isCurrent ? 'text-brand-strong' : 'text-ink-3',
              )}
            >
              {renderIcon(item.icon)}
            </span>
          ) : null}

          {collapsed ? null : <span className="flex-1 truncate">{item.label}</span>}

          {item.count !== undefined && item.count !== null ? (
            <Badge
              variant="solid"
              shape="rounded"
              size="sm"
              tone={
                item.countTone === 'danger'
                  ? 'danger'
                  : item.countTone === 'warning'
                    ? 'warning'
                    : 'neutral'
              }
              className={collapsed ? 'absolute top-space-2 right-space-2' : 'ml-auto'}
            >
              {formatCount(item.count)}
            </Badge>
          ) : null}
        </>
      );

      const comp = (
        <Comp
          key={collapsed ? undefined : item.id}
          type={isSlot ? undefined : 'button'}
          aria-current={isCurrent ? 'page' : undefined}
          aria-label={collapsed && typeof item.label === 'string' ? item.label : undefined}
          onClick={() => handleItemClick(item)}
          className={cn(
            'flex items-center rounded-ds-md text-body font-semibold transition-colors duration-fast text-left no-underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
            collapsed
              ? 'relative size-space-40 justify-center p-0'
              : 'w-full gap-space-8 px-space-8 py-space-6',
            isCurrent
              ? 'bg-brand-tint text-brand-strong'
              : 'text-ink-2 hover:bg-hover hover:text-ink active:bg-pressed',
          )}
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

      if (!collapsed) return comp;
      return typeof item.label === 'string' ? (
        <Tooltip key={item.id} content={item.label} side="right">
          {comp}
        </Tooltip>
      ) : (
        React.cloneElement(comp, { key: item.id })
      );
    };

    const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    const toggle = collapsible ? (
      <Tooltip content={toggleShortcut ? `${toggleLabel} (${toggleShortcut})` : toggleLabel} side="right">
        <Button
          type="button"
          variant="ghost"
          size="md"
          iconOnly
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          className="text-ink-2 hover:text-ink"
          icon={<Icon name="sidebar" size="md" />}
          onClick={() => setCollapsed(!collapsed)}
        />
      </Tooltip>
    ) : null;

    return (
      <nav
        ref={ref}
        aria-label="Primary"
        className={cn(
          'bg-surface border-r border-line p-space-12 flex flex-col h-full text-body select-none',
          collapsed ? 'w-space-64 min-w-space-64' : 'w-container-xs min-w-container-xs',
          collapsible && 'overflow-hidden transition-[width,min-width] duration-base motion-reduce:transition-none',
          className,
        )}
        {...props}
      >
        {/* Brand slot */}
        {collapsible ? (
          <div className={cn('flex items-center mb-space-8', collapsed ? 'justify-center' : 'justify-between')}>
            {brand && !collapsed ? (
              <div className="flex items-center px-space-6 py-space-10 text-ink rounded-ds-md">{brand}</div>
            ) : null}
            {toggle}
          </div>
        ) : brand ? (
          <div className="flex items-center px-space-6 py-space-10 text-ink rounded-ds-md mb-space-8">
            {brand}
          </div>
        ) : null}

        {/* Search slot */}
        {search ? (
          <div className={cn('mb-space-8 desk:mb-space-12', collapsed && 'flex justify-center')}>{search}</div>
        ) : null}

        {/* Grouped navigation items */}
        <div
          className={cn(
            'flex-1 space-y-space-8 desk:space-y-space-12 overflow-y-auto',
            collapsed && 'overflow-x-hidden',
          )}
        >
          {groups.map((group, gIdx) => (
            <div key={gIdx} className={cn('space-y-space-2', collapsed && 'flex flex-col items-center')}>
              {group.label && !collapsed ? (
                <div className="px-space-8 py-space-4 text-overline font-extrabold text-ink-4 uppercase tracking-wider">
                  {group.label}
                </div>
              ) : null}

              {group.items.map(renderItem)}
            </div>
          ))}
        </div>

        {/* Pinned footer slot */}
        {footer ? (
          <div className={cn('mt-auto pt-space-12 border-t border-line-soft', collapsed && 'flex justify-center')}>
            {footer}
          </div>
        ) : null}
      </nav>
    );
  },
);

Rail.displayName = 'Rail';
