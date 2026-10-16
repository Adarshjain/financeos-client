'use client';

import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { cn } from '../cn';
import { Icon, type IconName } from '../Icon/Icon';
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
}

function renderIcon(icon: React.ReactNode) {
  if (!icon) return null;
  if (typeof icon === 'string') {
    return <Icon name={icon as IconName} size="lg" />;
  }
  return icon;
}

/**
 * Desktop left navigation, 240px (`w-container-xs`).
 * Built from: Icon, Badge, Slot.
 * Takes brand, search, navigation groups, and footer slots from props.
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
      className,
      ...props
    },
    ref,
  ) => {
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

          <span className="flex-1 truncate">{item.label}</span>

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
              className="ml-auto"
            >
              {formatCount(item.count)}
            </Badge>
          ) : null}
        </>
      );

      return (
        <Comp
          key={item.id}
          type={isSlot ? undefined : 'button'}
          aria-current={isCurrent ? 'page' : undefined}
          onClick={() => handleItemClick(item)}
          className={cn(
            'w-full flex items-center gap-space-8 px-space-8 py-space-6 rounded-ds-md text-body font-semibold transition-colors duration-fast text-left no-underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
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
    };

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
        {/* Brand slot */}
        {brand ? (
          <div className="flex items-center px-space-6 py-space-10 text-ink rounded-ds-md mb-space-8">
            {brand}
          </div>
        ) : null}

        {/* Search slot */}
        {search ? <div className="mb-space-12">{search}</div> : null}

        {/* Grouped navigation items */}
        <div className="flex-1 space-y-space-12 overflow-y-auto">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-space-2">
              {group.label ? (
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
          <div className="mt-auto pt-space-12 border-t border-line-soft">
            {footer}
          </div>
        ) : null}
      </nav>
    );
  },
);

Rail.displayName = 'Rail';
